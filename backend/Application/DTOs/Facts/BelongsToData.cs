using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class BelongsToData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;

    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;
}
