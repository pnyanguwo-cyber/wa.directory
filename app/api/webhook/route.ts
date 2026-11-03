import { GET as botGet, POST as botPost } from 'wa-directory-bot'

export async function GET(request: Request): Promise<Response> {
  return (await botGet(request)) as unknown as Response
}

export async function POST(request: Request): Promise<Response> {
  return (await botPost(request)) as unknown as Response
}
