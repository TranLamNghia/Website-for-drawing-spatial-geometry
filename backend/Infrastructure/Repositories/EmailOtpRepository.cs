using Application.Interfaces;
using Domains.Entities;
using Infrastructure.Data;
using MongoDB.Driver;

namespace Infrastructure.Repositories;

public class EmailOtpRepository : IEmailOtpRepository
{
    private readonly IMongoCollection<EmailOtp> _otps;
    private bool _indexesEnsured;

    public EmailOtpRepository(MongoDbContext context)
    {
        _otps = context.EmailOtps;
    }

    public async Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        if (_indexesEnsured) return;

        var emailPurpose = new CreateIndexModel<EmailOtp>(
            Builders<EmailOtp>.IndexKeys
                .Ascending(o => o.Email)
                .Ascending(o => o.Purpose),
            new CreateIndexOptions { Unique = true, Name = "ux_email_otps_email_purpose" });

        var ttl = new CreateIndexModel<EmailOtp>(
            Builders<EmailOtp>.IndexKeys.Ascending(o => o.ExpiresAt),
            new CreateIndexOptions
            {
                ExpireAfter = TimeSpan.Zero,
                Name = "ttl_email_otps_expires_at",
            });

        await _otps.Indexes.CreateManyAsync(new[] { emailPurpose, ttl }, cancellationToken);
        _indexesEnsured = true;
    }

    public async Task<EmailOtp?> GetLatestAsync(
        string email,
        string purpose,
        CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return await _otps
            .Find(o => o.Email == normalized && o.Purpose == purpose)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task UpsertAsync(EmailOtp otp, CancellationToken cancellationToken = default)
    {
        await EnsureIndexesAsync(cancellationToken);
        otp.Email = otp.Email.Trim().ToLowerInvariant();

        await _otps.ReplaceOneAsync(
            o => o.Email == otp.Email && o.Purpose == otp.Purpose,
            otp,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }

    public async Task DeleteAsync(string email, string purpose, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        await _otps.DeleteOneAsync(
            o => o.Email == normalized && o.Purpose == purpose,
            cancellationToken);
    }
}
