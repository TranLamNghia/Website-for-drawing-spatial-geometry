using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class AngleBisectorData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("vertex")]
    public string Vertex { get; set; } = string.Empty;

    [JsonPropertyName("ray_1")]
    public string Ray1 { get; set; } = string.Empty;

    [JsonPropertyName("ray_2")]
    public string Ray2 { get; set; } = string.Empty;
}
