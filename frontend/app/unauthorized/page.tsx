import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
            <div className="card p-12 text-center max-w-md">
                <div className="text-6xl mb-6">🔒</div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">访问受限</h1>
                <p className="text-text-muted mb-6">
                    您没有权限访问此页面。请联系管理员获取相应权限。
                </p>
                <Link href="/" className="btn btn-primary">
                    返回首页
                </Link>
            </div>
        </div>
    );
}
