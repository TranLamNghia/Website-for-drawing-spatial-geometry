using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class PerpendicularRayData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("origin")]
    public string Origin { get; set; } = string.Empty;

    [JsonPropertyName("perpendicular_to")]
    public string PerpendicularTo { get; set; } = string.Empty;
}
