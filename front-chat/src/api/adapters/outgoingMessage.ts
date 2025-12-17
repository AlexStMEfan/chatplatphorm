export function adaptOutgoingMessage(
  chatId: string,
  text: string
) {
  return {
    type: "message:send",
    payload: {
      chat_id: chatId,
      text,
    },
  };
}