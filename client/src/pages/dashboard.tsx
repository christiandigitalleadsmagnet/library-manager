import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, AlertCircle, Clock } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const data = [
  { name: "Jan", loans: 400 },
  { name: "Feb", loans: 300 },
  { name: "Mar", loans: 200 },
  { name: "Apr", loans: 278 },
  { name: "May", loans: 189 },
  { name: "Jun", loans: 239 },
  { name: "Jul", loans: 349 },
];

export default function Dashboard() {
  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: () => api.getBooks(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.getTransactions(),
  });

  const totalBooks = books.length;
  const availableBooks = books.filter(b => b.status === "available").length;
  const activeLoans = transactions.filter(t => t.status === "active").length;
  const overdueLoans = transactions.filter(t => {
    if (t.status !== "active") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const stats = [
    {
      title: "Total Books",
      value: totalBooks.toString(),
      change: `${availableBooks} available`,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Loans",
      value: activeLoans.toString(),
      change: "Currently borrowed",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Overdue",
      value: overdueLoans.toString(),
      change: overdueLoans > 0 ? "Requires attention" : "All clear",
      icon: AlertCircle,
      color: overdueLoans > 0 ? "text-red-600" : "text-green-600",
      bgColor: overdueLoans > 0 ? "bg-red-100" : "bg-green-100",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of library statistics and activity.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">Loan Activity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="loans" 
                  fill="hsl(222 47% 15%)" 
                  radius={[4, 4, 0, 0]} 
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
