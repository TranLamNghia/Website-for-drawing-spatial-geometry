using System.Text.Json.Serialization;

namespace Application.DTOs.Queries;

public class RatioVolumeQueryData
{
    [JsonPropertyName("solids")]
    public List<string> Solids { get; set; } = [];
}
