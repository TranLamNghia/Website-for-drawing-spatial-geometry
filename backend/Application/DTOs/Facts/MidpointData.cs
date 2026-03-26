using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class MidpointData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("segment")]
    public string Segment { get; set; } = string.Empty;
}
