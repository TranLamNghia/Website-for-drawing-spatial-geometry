using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using Domains.Entities;

namespace Infrastructure.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString =
                configuration["PROD_MONGODB_CONNECTION_STRING"]
                ?? configuration.GetSection("MongoDbSettings:ConnectionString").Value
                ?? "mongodb://localhost:27017";

            var databaseName =
                configuration["PROD_MONGODB_DATABASE_NAME"]
                ?? configuration.GetSection("MongoDbSettings:DatabaseName").Value
                ?? "SpaticalGeometryDB";

            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<User> Users => _database.GetCollection<User>("Users");
        public IMongoCollection<EmailOtp> EmailOtps => _database.GetCollection<EmailOtp>("EmailOtps");
        public IMongoCollection<Problem> Problems => _database.GetCollection<Problem>("Problems");
        public IMongoCollection<Shape> Shapes => _database.GetCollection<Shape>("Shapes");
        public IMongoCollection<PointResult> PointResults => _database.GetCollection<PointResult>("PointResults");
    }
}
