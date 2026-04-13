import { TicketState, TicketAction, TransitionContext, TransitionMap } from "@/types/ticket";
import { Role } from "@/types/roles";

const TRANSITIONS: TransitionMap = {
  [TicketState.AVAILABLE]: {
    [TicketAction.RESERVE]: {
      to: TicketState.RESERVED,
      guard: (ctx) => ctx.hasCapacity === true,
    },
  },
  [TicketState.RESERVED]: {
    [TicketAction.ISSUE]: {
      to: TicketState.ISSUED,
      guard: (ctx) => ctx.paymentConfirmed === true,
    },
    [TicketAction.RELEASE]: {
      to: TicketState.AVAILABLE,
    },
    [TicketAction.CANCEL]: {
      to: TicketState.CANCELLED,
    },
  },
  [TicketState.ISSUED]: {
    [TicketAction.CLAIM]: {
      to: TicketState.CLAIMED,
      guard: (ctx) => ctx.validClaimToken === true,
    },
    [TicketAction.SCAN]: {
      to: TicketState.SCANNED,
      guard: (ctx) => ctx.validQr === true,
    },
    [TicketAction.CANCEL]: {
      to: TicketState.CANCELLED,
      guard: (ctx) =>
        ctx.role === Role.ORG_ADMIN || ctx.role === Role.SUPERADMIN,
    },
  },
  [TicketState.CLAIMED]: {
    [TicketAction.SCAN]: {
      to: TicketState.SCANNED,
      guard: (ctx) => ctx.validQr === true,
    },
    [TicketAction.CANCEL]: {
      to: TicketState.CANCELLED,
      guard: (ctx) =>
        ctx.role === Role.ORG_ADMIN || ctx.role === Role.SUPERADMIN,
    },
  },
  [TicketState.CANCELLED]: {
    [TicketAction.RELEASE]: {
      to: TicketState.AVAILABLE,
      guard: (ctx) => ctx.role === Role.SUPERADMIN,
    },
  },
};

export interface TransitionResult {
  success: true;
  nextState: TicketState;
}

export interface TransitionError {
  success: false;
  error: string;
}

export function transitionTicket(
  current: TicketState,
  action: TicketAction,
  context: TransitionContext = {}
): TransitionResult | TransitionError {
  const stateTransitions = TRANSITIONS[current];
  if (!stateTransitions) {
    return { success: false, error: `No transitions defined for state: ${current}` };
  }

  const transition = stateTransitions[action];
  if (!transition) {
    return {
      success: false,
      error: `Action '${action}' is not valid from state '${current}'`,
    };
  }

  if (transition.guard && !transition.guard(context)) {
    return {
      success: false,
      error: `Guard failed for action '${action}' from state '${current}'`,
    };
  }

  return { success: true, nextState: transition.to };
}

export function canTransition(
  current: TicketState,
  action: TicketAction,
  context: TransitionContext = {}
): boolean {
  const result = transitionTicket(current, action, context);
  return result.success;
}

export function getAvailableActions(current: TicketState): TicketAction[] {
  return Object.keys(TRANSITIONS[current] ?? {}) as TicketAction[];
}
