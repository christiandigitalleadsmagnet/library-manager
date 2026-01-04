import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Library, BookOpen, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { api, type School } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import generatedImage from "@assets/generated_images/modern_library_interior_with_warm_lighting_and_bookshelves.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  schoolSlug: z.string().optional(),
  isSuperAdmin: z.boolean().default(false),
});

export default function Login() {
  const { login } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [isNexKool, setIsNexKool] = useState(() => 
    typeof document !== 'undefined' && document.documentElement.classList.contains('nexkool')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsNexKool(document.documentElement.classList.contains('nexkool'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const schoolsList = await api.getSchools();
        setSchools(schoolsList);
      } catch (error) {
        console.error("Failed to fetch schools:", error);
      } finally {
        setLoadingSchools(false);
      }
    }
    fetchSchools();
  }, []);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      schoolSlug: "",
      isSuperAdmin: false,
    },
  });

  const isSuperAdmin = form.watch("isSuperAdmin");

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      if (!values.isSuperAdmin && !values.schoolSlug) {
        form.setError("schoolSlug", { message: "Please select a school" });
        return;
      }
      await login(values.email, values.password, values.isSuperAdmin ? undefined : values.schoolSlug);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-6">
              {isNexKool ? (
                <>
                  <div className="bg-primary p-2.5 rounded-xl shadow-lg">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground tracking-tight">NexKool</span>
                    <span className="text-lg text-primary font-semibold ml-1">Library</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Library className="h-8 w-8 text-primary" />
                  </div>
                  <span className="font-serif text-2xl font-bold">Athenaeum</span>
                </>
              )}
            </div>
            <h1 className={isNexKool ? "text-3xl font-bold tracking-tight text-foreground" : "font-serif text-4xl font-bold tracking-tight"}>
              {isNexKool ? "Sign in to your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground">
              {isNexKool ? "Access your school's library management system" : "Sign in to access your school's library management system."}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="isSuperAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        data-testid="checkbox-superadmin"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Super Admin Login
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Check this if you're a super admin managing all schools
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {!isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="schoolSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-school" className="h-11">
                            <SelectValue placeholder={loadingSchools ? "Loading schools..." : "Select your school"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.slug}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-email"
                        placeholder="your.email@school.edu" 
                        {...field} 
                        className="h-11" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-password"
                        type="password" 
                        {...field} 
                        className="h-11" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                data-testid="button-signin"
                type="submit" 
                className="w-full h-11 text-base group"
                disabled={form.formState.isSubmitting || loadingSchools}
              >
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary underline underline-offset-4">Forgot password?</a>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <div className="hidden lg:block w-1/2 relative bg-black">
        <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-10" />
        <img 
          src={generatedImage} 
          alt="Library Interior" 
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute bottom-12 left-12 right-12 z-20 text-white">
          <blockquote className="font-serif text-3xl leading-tight mb-4">
            "A library is not a luxury but one of the necessities of life."
          </blockquote>
          <cite className="text-white/80 font-sans not-italic">— Henry Ward Beecher</cite>
        </div>
      </div>
    </div>
  );
}
