using System.Text.Json.Serialization;

namespace Application.DTOs.Queries;

public class DistanceQueryData
{
    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;
}
