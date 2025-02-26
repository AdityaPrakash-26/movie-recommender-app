import { useEffect, useState } from "react";
import { Form, useActionData, redirect } from "@remix-run/react";

import { loginUser } from "~/utils/api";
import { useNavigate } from "@remix-run/react";

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;

  const response = await loginUser(username);
  if (response.error) {
    return { error: response.error };
  }
  return username;
};

export default function LoginPage() {
  const actionData = useActionData<{ error?: string }>(); // Get error message from action
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(actionData?.error || null);

  useEffect(() => {
    console.log("actionData", actionData);
    if (actionData && !actionData.error) {
      localStorage.setItem("username", actionData as unknown as string);
      console.log("Debugging!")
      console.log(localStorage.getItem("username"));
      navigate("/");
    }
  }, [actionData]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        {error && <p className="text-red-500">{error}</p>}
        <Form method="post" className="flex flex-col">
          <input
            name="username"
            placeholder="Enter username"
            className="p-2 rounded mb-3 text-white"
            required
            onChange={() => setError(null)}
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Login
          </button>
        </Form>
        <p className="text-sm mt-3">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-400 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
