using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelBookingApi.Data;
using HotelBookingApi.DTOs;
using HotelBookingApi.Models;

namespace HotelBookingApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Auth/register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
        {
            // 1. Kiểm tra Email đã tồn tại trong DB chưa
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
            {
                return BadRequest(new { message = "Email này đã được sử dụng." });
            }

            // 2. Mã hóa mật khẩu trước khi lưu DB
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // 3. Tạo bản ghi User mới
            var user = new User
            {
                Email = dto.Email,
                PasswordHash = passwordHash,
                FullName = string.IsNullOrWhiteSpace(dto.FullName) ? dto.Email.Split('@')[0] : dto.FullName,
                Role = "User"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Trả về thông tin đăng nhập thành công
            return Ok(new AuthResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                Token = $"mock-jwt-token-for-user-{user.Id}"
            });
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
        {
            // 1. Query DB tìm user theo Email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (user == null)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });
            }

            // 2. Kiểm tra mật khẩu mã hóa
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác." });
            }

            // 3. Trả về kết quả thành công
            return Ok(new AuthResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                Token = $"mock-jwt-token-for-user-{user.Id}"
            });
        }
    }
}