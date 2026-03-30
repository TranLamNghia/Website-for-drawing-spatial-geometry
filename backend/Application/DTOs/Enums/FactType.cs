using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FactType
{
    Shape,
    Length,
    Ratio,
    Distance,
    Perpendicular,
    Parallel,
    Intersection,
    Midpoint,
    Centroid,
    Circumcenter,
    Incenter,
    Orthocenter,
    Projection,
    Angle,
    belongs_to,
    Coplanar,
    Collinear,
    Tangent,
    Inscribed,
    Circumscribed,
    Area,
    Volume,
    Perimeter
}
