using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class TangentData
{
    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];

    [JsonPropertyName("point")]
    public string? Point { get; set; }
}
