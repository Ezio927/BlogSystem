/** Keep the original pet interaction without credentials or external AI calls. */
export async function requestPetReply(message: string): Promise<string> {
  return message.includes('鱼') ? '谢谢小鱼干，喵～今天也要记得休息！' : '喵～我现在只陪伴，不连接 AI 服务。';
}
