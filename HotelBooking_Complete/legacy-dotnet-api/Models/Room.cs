using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBookingApi.Models
{
    public class Room
    {
        public int Id { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")] // Định kiểu giá trị chính xác cho SQL Server
        public decimal Price { get; set; }

        public bool IsAvailable { get; set; } = true;
        public string Description { get; set; } = string.Empty;
    }
}