from starlette.types import ASGIApp, Message, Receive, Scope, Send
from starlette.responses import JSONResponse
from .config import get_settings


class RequestBodyLimitMiddleware:
    """Reject oversized bodies while streaming, before multipart parsing buffers them."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self.limit = get_settings().max_request_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.limit:
                    response = JSONResponse({"detail": "Request body too large"}, status_code=413)
                    await response(scope, receive, send)
                    return
            except ValueError:
                response = JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
                await response(scope, receive, send)
                return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.limit:
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            response = JSONResponse({"detail": "Request body too large"}, status_code=413)
            await response(scope, receive, send)


class _BodyTooLarge(Exception):
    pass
