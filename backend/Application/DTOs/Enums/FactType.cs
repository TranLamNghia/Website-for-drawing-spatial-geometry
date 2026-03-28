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
    Projection,
    Angle,
    BelongsTo,
    Coplanar,
    Collinear,
    Tangent,
    Inscribed,
    Circumscribed
}
