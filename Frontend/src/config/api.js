// API Configuration
export const API_CONFIG = {
  // Backend URL
  BASE_URL: "http://localhost:3001",
  
  // Endpoints
  ENDPOINTS: {
    LOGIN: "/api/login",
    REGISTER: "/api/register",
    REGISTRATIONS: "/api/registrations",
    REGISTRATION_STATUS: "/api/registration-status",
  },

  // Timeout (ms)
  TIMEOUT: 10000,
};

// Hàm gọi API login
export const loginAPI = async (username, password) => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    // Xử lý response theo format của backend
    if (response.ok) {
      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } else {
      return {
        success: false,
        message: data.message || "Lỗi đăng nhập",
      };
    }
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Lỗi kết nối server",
    };
  }
};

// Hàm gọi API register
export const registerAPI = async (fullName, username, password, email, phone, apartment) => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        username,
        password,
        email,
        phone,
        apartment,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: data.message,
        registration: data.registration,
      };
    } else {
      return {
        success: false,
        message: data.message || "Lỗi đăng ký",
      };
    }
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Lỗi kết nối server",
    };
  }
};

// Hàm lấy danh sách đăng ký (Admin)
export const getRegistrationsAPI = async () => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTRATIONS}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Lỗi kết nối server",
    };
  }
};

// Hàm duyệt đăng ký (Admin)
export const approveRegistrationAPI = async (id) => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTRATIONS}/${id}/approve`;
  
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Lỗi kết nối server",
    };
  }
};

// Hàm từ chối đăng ký (Admin)
export const rejectRegistrationAPI = async (id, reason) => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTRATIONS}/${id}/reject`;
  
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Lỗi kết nối server",
    };
  }
};
