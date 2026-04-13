import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  return {
    locale: "es-CR",
    messages: (await import("../messages/es-CR.json")).default,
  };
});
