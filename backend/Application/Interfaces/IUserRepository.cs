using Domains.Entities;

namespace Application.Interfaces;

public interface IUserRepository
{
    Task EnsureIndexesAsync(CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default);

    Task<User> CreateAsync(User user, CancellationToken cancellationToken = default);

    Task ReplaceAsync(User user, CancellationToken cancellationToken = default);

    Task<User> UpsertGoogleUserAsync(
        string googleId,
        string email,
        string? fullName,
        string? avatar,
        CancellationToken cancellationToken = default);
}
