import { useState } from "react";
import { Form, useActionData, redirect } from "@remix-run/react";
import { loginUser } from "~/utils/api";

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;

  const response = await loginUser(username);
  if (response.error) {
    return { error: response.error };
  }
  console.log(response);
  console.log("User logged in successfully.");
  return redirect("/");
};

export default function LoginPage() {
  const actionData = useActionData<{ error?: string }>(); // Get error message from action
  const [error, setError] = useState<string | null>(actionData?.error || null);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        {error && <p className="text-red-500">{error}</p>}
        <Form method="post" className="flex flex-col">
          <input
            name="username"
            placeholder="Enter username"
            className="p-2 rounded mb-3 text-black"
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
