using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class ProjectionData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("onto")]
    public string Onto { get; set; } = string.Empty;
}
