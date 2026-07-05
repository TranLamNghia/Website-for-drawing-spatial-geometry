using Application.Interfaces;
using Domains.Entities;
using Infrastructure.Data;
using MongoDB.Driver;

namespace Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(MongoDbContext context)
    {
        _users = context.Users;
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default)
    {
        return await _users
            .Find(u => u.GoogleId == googleId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<User> UpsertGoogleUserAsync(
        string googleId,
        string email,
        string? fullName,
        string? avatar,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByGoogleIdAsync(googleId, cancellationToken);
        var now = DateTime.UtcNow;

        if (existing != null)
        {
            existing.Email = email;
            existing.FullName = fullName;
            existing.Avatar = avatar;
            existing.UpdatedAt = now;

            await _users.ReplaceOneAsync(
                u => u.Id == existing.Id,
                existing,
                cancellationToken: cancellationToken);

            return existing;
        }

        var user = new User
        {
            GoogleId = googleId,
            Email = email,
            FullName = fullName,
            Avatar = avatar,
            Username = email,
            Role = new List<string> { "User" },
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _users.InsertOneAsync(user, cancellationToken: cancellationToken);
        return user;
    }
}
