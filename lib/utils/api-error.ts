export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  UNAUTHORIZED: new AppError("UNAUTHORIZED", "No autorizado", 401),
  FORBIDDEN: new AppError("FORBIDDEN", "Acceso denegado", 403),
  NOT_FOUND: (resource: string) =>
    new AppError("NOT_FOUND", `${resource} no encontrado`, 404),
  CONFLICT: (msg: string) => new AppError("CONFLICT", msg, 409),
  VALIDATION: (msg: string) => new AppError("VALIDATION", msg, 422),
};
