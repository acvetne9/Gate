import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Background gradients matching LandingPage */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
      </div>

      {/* Error card */}
      <div className="relative max-w-2xl mx-auto px-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-12 text-center hover:-translate-y-2 transition-all duration-500">
          {/* 404 Text */}
          <div className="mb-8">
            <h1 className="text-9xl font-light text-gray-900 mb-4 tracking-tight">
              4<span className="text-green-800">0</span>4
            </h1>
            <div className="w-20 h-1 bg-green-800 mx-auto mb-6 rounded-full" />
          </div>

          {/* Message */}
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-xl text-gray-600 mb-10 font-light">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Navigation buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-white text-gray-700 font-medium rounded-full hover:bg-gray-50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-gray-300 flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group"
            >
              <Home className="w-5 h-5" />
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
