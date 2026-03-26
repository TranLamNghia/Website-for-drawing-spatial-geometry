using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class CollinearData
{
    [JsonPropertyName("points")]
    public List<string> Points { get; set; } = [];
}
