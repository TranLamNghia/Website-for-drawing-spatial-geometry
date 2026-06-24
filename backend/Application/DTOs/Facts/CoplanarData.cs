using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class CoplanarData
{
    [JsonPropertyName("points")]
    public List<string>? Points { get; set; }

    [JsonPropertyName("objects")]
    public List<string>? Objects { get; set; }
}
