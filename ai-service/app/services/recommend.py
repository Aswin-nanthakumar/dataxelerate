"""AI recommendation case builder — pairs intervention types with business
cases (problem, root cause, cost, impact, ROI, priority, roadmap)."""

from __future__ import annotations

from typing import List

from ..schemas.models import RecommendRequest, RecommendationItem

COSTS = {
    "new_bus_route": 850000,
    "shuttle_service": 320000,
    "bike_share": 140000,
    "ev_station": 95000,
    "route_optimization": 60000,
    "service_expansion": 400000,
    "pedestrian_improvement": 210000,
}

IMPACT = {
    "new_bus_route": (12, 6, 420),
    "shuttle_service": (7, 4, 210),
    "bike_share": (3, 3, 95),
    "ev_station": (1, 1, 260),
    "route_optimization": (5, 5, 180),
    "service_expansion": (9, 4, 300),
    "pedestrian_improvement": (2, 1, 45),
}


def _priority(urgency: float) -> str:
    if urgency > 0.72:
        return "critical"
    if urgency > 0.58:
        return "high"
    if urgency > 0.4:
        return "medium"
    return "low"


def _roi(rec_type: str, cost: float, urgency: float) -> float:
    ridership, congestion, carbon = IMPACT[rec_type]
    annual = ridership * 48000 + congestion * 30000 + carbon * 45
    five_year = annual * 5 * (0.7 + urgency * 0.6)
    return round((five_year - cost) / (cost or 1), 2)


TITLES = {
    "new_bus_route": "New feeder bus route",
    "shuttle_service": "On-demand shuttle",
    "bike_share": "Bike-share station cluster",
    "ev_station": "EV charging hub",
    "route_optimization": "Route network optimisation",
    "service_expansion": "Service expansion plan",
    "pedestrian_improvement": "Walk-access improvement",
}

PROBLEMS = {
    "new_bus_route": "No high-frequency trunk service; long walks to transit",
    "shuttle_service": "Weak feeder layer isolating the zone from rapid transit",
    "bike_share": "Missing shared micromobility for short access trips",
    "ev_station": "EV charging desert in a fast-growing corridor",
    "route_optimization": "Under-performing reliability and duplicated segments",
    "service_expansion": "Timetable does not match observed demand peaks",
    "pedestrian_improvement": "Unsafe walking environment around transit access",
}

ROOTS = {
    "new_bus_route": "Network design prioritised arterial coverage over neighbourhood penetration",
    "shuttle_service": "Low-density land use makes fixed-route feeders uneconomic",
    "bike_share": "Dock investment lagged residential growth",
    "ev_station": "Charger deployment skipped growth corridors",
    "route_optimization": "Headways drifted from schedule; duplicated segments persist",
    "service_expansion": "Timetables frozen at pre-growth demand levels",
    "pedestrian_improvement": "Footway/lighting budgets deferred vs road widening",
}


def recommend(req: RecommendRequest) -> List[RecommendationItem]:
    types: List[str] = []
    if req.connectivity_deficit > 0.55:
        types += ["new_bus_route", "shuttle_service"]
    if req.connectivity_deficit > 0.35:
        types += ["bike_share"]
    if req.growth_rate > 0.04:
        types += ["ev_station", "service_expansion"]
    if req.urgency > 0.5:
        types += ["route_optimization"]
    if req.urgency > 0.6:
        types += ["pedestrian_improvement"]
    if not types:
        types = ["route_optimization"]

    seen = set()
    items: List[RecommendationItem] = []
    for t in types:
        if t in seen:
            continue
        seen.add(t)
        cost = round(COSTS[t] * (0.85 + req.connectivity_deficit * 0.3))
        items.append(RecommendationItem(
            rec_type=t,
            title=f"{TITLES[t]} — {req.zone_name}",
            problem=PROBLEMS[t],
            root_cause=ROOTS[t],
            priority_level=_priority(req.urgency),
            roi=_roi(t, cost, req.urgency),
            estimated_cost_usd=cost,
        ))
    items.sort(key=lambda r: r.roi, reverse=True)
    return items
