"""
Route optimization utilities.

haversine()     — straight-line distance between two GPS coordinates
optimize_route() — nearest-neighbor TSP heuristic (greedy, O(n²))
"""

import math
from typing import Tuple


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns great-circle distance in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def optimize_route(
    yard: Tuple[float, float],
    bins: list,
    city_speed_kmh: float = 30.0,
) -> Tuple[list, float, int]:
    """
    Nearest-neighbor TSP heuristic starting and ending at the yard.

    Args:
        yard: (lat, lng) of Dadumajra Waste Yard
        bins: list of Bin ORM objects with .latitude, .longitude, .id
        city_speed_kmh: average city truck speed for ETA estimate

    Returns:
        (ordered_bins, total_distance_km, estimated_time_minutes)

    Complexity: O(n²) — fine for n ≤ 18 bins.
    Future improvement: 2-opt swaps or simulated annealing for better routes.
    """
    if not bins:
        return [], 0.0, 0

    remaining = list(bins)
    ordered: list = []
    cur_lat, cur_lng = yard
    total_km = 0.0

    while remaining:
        nearest = min(
            remaining,
            key=lambda b: haversine(cur_lat, cur_lng, b.latitude, b.longitude),
        )
        seg_km = haversine(cur_lat, cur_lng, nearest.latitude, nearest.longitude)
        total_km += seg_km
        ordered.append(nearest)
        cur_lat, cur_lng = nearest.latitude, nearest.longitude
        remaining.remove(nearest)

    # Return leg to yard
    total_km += haversine(cur_lat, cur_lng, yard[0], yard[1])

    estimated_minutes = int((total_km / city_speed_kmh) * 60)

    return ordered, round(total_km, 2), estimated_minutes
