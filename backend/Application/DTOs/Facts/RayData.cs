using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class RayData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("origin")]
    public string Origin { get; set; } = string.Empty;

    [JsonPropertyName("ray_point")]
    public string RayPoint { get; set; } = string.Empty;
}
