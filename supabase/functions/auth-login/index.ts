import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, pin, action, full_name, phone } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const headers: Record<string, string> = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    if (action === "login") {
      if (!email || !pin) {
        return new Response(JSON.stringify({ error: "Thiếu email hoặc PIN" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `${supabaseUrl}/rest/v1/master_users?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&pin_hash=eq.${encodeURIComponent(pin)}&select=*,role:master_roles(*)`,
        { headers }
      );

      const users = await res.json();

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ error: "Email hoặc PIN không đúng." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = users[0];

      if (user.status !== "active") {
        return new Response(JSON.stringify({ error: "Tài khoản đã bị khóa." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register") {
      if (!email || !pin || !full_name) {
        return new Response(JSON.stringify({ error: "Thiếu thông tin bắt buộc" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (pin.length < 4) {
        return new Response(JSON.stringify({ error: "PIN phải có ít nhất 4 ký tự" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check existing
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/master_users?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=id`,
        { headers }
      );
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ error: "Email đã được đăng ký." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get trainee role
      const roleRes = await fetch(
        `${supabaseUrl}/rest/v1/master_roles?code=eq.trainee&select=id,code`,
        { headers }
      );
      const roles = await roleRes.json();
      const roleCode = roles && roles.length > 0 ? roles[0].code : "trainee";

      // Count users for code
      const countRes = await fetch(
        `${supabaseUrl}/rest/v1/master_users?select=id`,
        { headers }
      );
      const allUsers = await countRes.json();
      const userCode = `USR-${String((allUsers?.length ?? 0) + 1).padStart(3, "0")}`;

      // Insert
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/master_users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: userCode,
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          pin_hash: pin,
          role_code: roleCode,
          status: "active",
          skills: [],
          shift: "full-time",
          monthly_salary: 0,
          notes: "Tự đăng ký",
        }),
      });

      const newUser = await insertRes.json();

      if (!insertRes.ok) {
        return new Response(JSON.stringify({ error: "Lỗi tạo tài khoản: " + (newUser.message || JSON.stringify(newUser)) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch with role
      const fullRes = await fetch(
        `${supabaseUrl}/rest/v1/master_users?id=eq.${newUser[0].id}&select=*,role:master_roles(*)`,
        { headers }
      );
      const fullUser = await fullRes.json();

      return new Response(JSON.stringify({ user: fullUser[0], message: "Đăng ký thành công!" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action không hợp lệ" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Lỗi server: " + (err instanceof Error ? err.message : String(err)) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
