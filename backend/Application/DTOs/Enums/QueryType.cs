using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum QueryType
{
    volume,
    distance,
    area,
    angle,
    cosine_between_planes,
    sine_between_line_and_plane,
    ratio_volume,
    radius,
    perimeter,
    locus,
    proof_parallel,
    proof_perpendicular,
    equation_line,
    equation_plane,
    equation_sphere,
    coordinates,
    proof_equal,
    length
}
