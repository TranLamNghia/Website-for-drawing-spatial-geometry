using Domains.Entities;

namespace Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default);

    Task<User> UpsertGoogleUserAsync(
        string googleId,
        string email,
        string? fullName,
        string? avatar,
        CancellationToken cancellationToken = default);
}
