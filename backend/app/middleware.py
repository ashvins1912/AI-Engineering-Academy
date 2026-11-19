from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from collections import defaultdict, deque
from time import monotonic
from .config import get_settings

class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    """Single-process limiter. Replace with a shared Redis limiter for multi-instance production."""
    def __init__(self, app):
        super().__init__(app)
        self.events = defaultdict(deque)
        self.limit = get_settings().rate_limit_per_minute

    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health/live", "/health/ready"}:
            return await call_next(request)
        key = request.client.host if request.client else "unknown"
        now = monotonic()
        if key not in self.events and len(self.events) >= 10000:
            expired = [client for client, events in self.events.items() if not events or now - events[-1] > 60]
            for client in expired:
                self.events.pop(client, None)
            if len(self.events) >= 10000:
                return JSONResponse({"detail": "Rate limiter capacity reached"}, status_code=503)
        queue = self.events[key]
        while queue and now - queue[0] > 60:
            queue.popleft()
        if len(queue) >= self.limit:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        queue.append(now)
        return await call_next(request)
