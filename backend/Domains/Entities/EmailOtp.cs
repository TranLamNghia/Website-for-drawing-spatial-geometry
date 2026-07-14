using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domains.Entities;

public class EmailOtp
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("code_hash")]
    public string CodeHash { get; set; } = string.Empty;

    [BsonElement("purpose")]
    public string Purpose { get; set; } = "register";

    [BsonElement("attempts")]
    public int Attempts { get; set; }

    [BsonElement("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
