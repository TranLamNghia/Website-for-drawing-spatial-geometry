using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domains.Entities
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("username")]
        public string? Username { get; set; }

        [BsonElement("password")]
        public string? Password { get; set; }

        [BsonElement("full_name")]
        public string? FullName { get; set; }

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("avatar")]
        public string? Avatar { get; set; }

        [BsonElement("google_id")]
        public string? GoogleId { get; set; }

        [BsonElement("role")]
        public List<string> Role { get; set; } = new() { "User" };

        [BsonElement("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}