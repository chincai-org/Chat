declare module "cookie-parser" {
	import type { Request, Response } from "express";
	export default function cookieParser(): (
		req: Request,
		res: Response,
		next: () => void,
	) => void;
}
