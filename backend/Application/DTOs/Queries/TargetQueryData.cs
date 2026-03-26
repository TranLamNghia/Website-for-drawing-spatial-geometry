using System.Text.Json.Serialization;

namespace Application.DTOs.Queries;

/// <summary>
/// Use for: volume, area, radius, perimeter, locus,
/// equation_line, equation_plane, equation_sphere, coordinates
/// </summary>
public class TargetQueryData
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;
}
