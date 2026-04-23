using Microsoft.Extensions.Configuration;
using Microsoft.Extensions;
using MongoDB.Driver;
using Domains.Entities;

namespace Infrastructure.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var client = new MongoClient(configuration.GetSection("MongoDbSettings:ConnectionString").Value);
            _database = client.GetDatabase(configuration.GetSection("MongoDbSettings:DatabaseName").Value);
        }

        public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
        public IMongoCollection<Problem> Problems => _database.GetCollection<Problem>("Problems");
        public IMongoCollection<Shape> Shapes => _database.GetCollection<Shape>("Shapes");
        public IMongoCollection<PointResult> PointResults => _database.GetCollection<PointResult>("PointResults");
    }
}