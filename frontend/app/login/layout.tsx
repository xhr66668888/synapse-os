export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 登录页面不显示侧边栏
    return <>{children}</>;
}
