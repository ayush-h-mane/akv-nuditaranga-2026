"""
In-memory high-performance TTL cache module for AKV Nuditaranga 2026.
Significantly reduces database load by caching frequently read, rarely changing
catalog and configuration data (events, festival schedule, activities, gallery, reels, attendance dates).
"""

import time
import threading
from typing import Any, Optional, Dict, Tuple

class FastCache:
    def __init__(self):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            val, expiry = entry
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        with self._lock:
            expiry = time.time() + ttl_seconds
            self._cache[key] = (value, expiry)

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def delete_prefix(self, prefix: str) -> None:
        with self._lock:
            keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._cache[k]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def stats(self) -> dict:
        with self._lock:
            now = time.time()
            valid_keys = [k for k, (_, exp) in self._cache.items() if exp > now]
            return {
                "active_entries": len(valid_keys),
                "total_stored_entries": len(self._cache)
            }

# Global singleton cache instance
fast_cache = FastCache()
