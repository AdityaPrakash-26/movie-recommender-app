import { useEffect, useState } from "react";
import { Form, useActionData, useNavigate } from "@remix-run/react";


import { registerUser } from "~/utils/api";

export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const username = formData.get("username") as string;

  if (!username) {
    return { error: "Username is required." };
  }

  const response = await registerUser(username);
  if (response.error) {
    return { error: response.error };
  }

  return username;
};

export default function RegisterPage() {
  const actionData = useActionData<{ error?: string }>(); // Get error message from action
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(actionData?.error || null);

  useEffect(() => {
    if (actionData && !actionData.error) {
      localStorage.setItem("username", actionData as unknown as string);
      navigate("/");
    }

    if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <Form method="post" className="flex flex-col">
          <input
            name="username"
            placeholder="Choose a username"
            className="p-2 rounded mb-3 text-white"
            required
            onChange={() => setError(null)}
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Register
          </button>
        </Form>
        {/* show error here */}
        {error && <p className="text-red-500 mt-3">{error}</p>}
        <p className="text-sm mt-3">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
