using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum IntersectionResultType
{
    empty,
    point,
    line,
    circle,
    polygon
}
