using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AngleType
{
    line_line,
    line_plane,
    plane_plane,
    vector_vector,
    vector_line,
    vector_plane
}
