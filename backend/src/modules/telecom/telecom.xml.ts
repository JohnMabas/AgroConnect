function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildVoiceMenuXml(params: {
  message: string;
  end: boolean;
  callbackUrl: string;
}): string {
  const message = escapeXml(params.message);
  const callbackUrl = escapeXml(params.callbackUrl);
  if (params.end) {
    return `<Response><Say>${message}</Say><Hangup/></Response>`;
  }
  return [
    "<Response>",
    `<GetDigits timeout="10" finishOnKey="#" callbackUrl="${callbackUrl}">`,
    `<Say>${message}</Say>`,
    "</GetDigits>",
    "<Say>We did not receive your input. Please try again.</Say>",
    `<Redirect>${callbackUrl}</Redirect>`,
    "</Response>",
  ].join("");
}

export function buildVoiceHangupXml(message: string): string {
  return `<Response><Say>${escapeXml(message)}</Say><Hangup/></Response>`;
}
