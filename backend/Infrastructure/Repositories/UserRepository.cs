using Application.Interfaces;
using Domains.Entities;
using Infrastructure.Data;
using MongoDB.Driver;

namespace Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;
    private bool _indexesEnsured;

    public UserRepository(MongoDbContext context)
    {
        _users = context.Users;
    }

    public async Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        if (_indexesEnsured) return;

        // Drop legacy sparse unique index that treated google_id:null as a duplicate key.
        try
        {
            await _users.Indexes.DropOneAsync("ux_users_google_id", cancellationToken);
        }
        catch (MongoCommandException)
        {
            // Index may not exist yet.
        }

        var emailIndex = new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true, Name = "ux_users_email" });

        var googleIndex = new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.GoogleId),
            new CreateIndexOptions<User>
            {
                Unique = true,
                Name = "ux_users_google_id",
                PartialFilterExpression = Builders<User>.Filter.Type(u => u.GoogleId, MongoDB.Bson.BsonType.String),
            });

        await _users.Indexes.CreateManyAsync(new[] { emailIndex, googleIndex }, cancellationToken);
        _indexesEnsured = true;
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _users.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeEmail(email);
        return await _users.Find(u => u.Email == normalized).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default)
    {
        return await _users
            .Find(u => u.GoogleId == googleId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<User> CreateAsync(User user, CancellationToken cancellationToken = default)
    {
        user.Email = NormalizeEmail(user.Email);
        await _users.InsertOneAsync(user, cancellationToken: cancellationToken);
        return user;
    }

    public async Task ReplaceAsync(User user, CancellationToken cancellationToken = default)
    {
        user.Email = NormalizeEmail(user.Email);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.ReplaceOneAsync(u => u.Id == user.Id, user, cancellationToken: cancellationToken);
    }

    public async Task<User> UpsertGoogleUserAsync(
        string googleId,
        string email,
        string? fullName,
        string? avatar,
        CancellationToken cancellationToken = default)
    {
        await EnsureIndexesAsync(cancellationToken);

        var normalizedEmail = NormalizeEmail(email);
        var now = DateTime.UtcNow;

        var byGoogle = await GetByGoogleIdAsync(googleId, cancellationToken);
        if (byGoogle != null)
        {
            byGoogle.Email = normalizedEmail;
            // Do not overwrite profile fields the user already set.
            if (string.IsNullOrWhiteSpace(byGoogle.FullName))
                byGoogle.FullName = fullName;
            if (string.IsNullOrWhiteSpace(byGoogle.Avatar))
                byGoogle.Avatar = avatar;
            byGoogle.EmailVerified = true;
            byGoogle.UpdatedAt = now;
            await ReplaceAsync(byGoogle, cancellationToken);
            return byGoogle;
        }

        var byEmail = await GetByEmailAsync(normalizedEmail, cancellationToken);
        if (byEmail != null)
        {
            // Auto-link when Google email matches an existing account.
            if (!string.IsNullOrEmpty(byEmail.GoogleId) && byEmail.GoogleId != googleId)
            {
                throw new InvalidOperationException(
                    "Email is already linked to a different Google account.");
            }

            byEmail.GoogleId = googleId;
            if (string.IsNullOrWhiteSpace(byEmail.FullName))
                byEmail.FullName = fullName;
            if (string.IsNullOrWhiteSpace(byEmail.Avatar))
                byEmail.Avatar = avatar;
            byEmail.EmailVerified = true;
            byEmail.UpdatedAt = now;
            await ReplaceAsync(byEmail, cancellationToken);
            return byEmail;
        }

        var user = new User
        {
            GoogleId = googleId,
            Email = normalizedEmail,
            FullName = fullName,
            Avatar = avatar,
            Username = normalizedEmail,
            EmailVerified = true,
            Role = new List<string> { "User" },
            CreatedAt = now,
            UpdatedAt = now,
        };

        await CreateAsync(user, cancellationToken);
        return user;
    }

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
