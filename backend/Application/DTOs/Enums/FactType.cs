using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FactType
{
    shape,
    length,
    ratio,
    distance,
    perpendicular,
    parallel,
    intersection,
    midpoint,
    projection,
    angle,
    belongs_to,
    coplanar,
    collinear,
    tangent,
    inscribed,
    circumscribed
}
