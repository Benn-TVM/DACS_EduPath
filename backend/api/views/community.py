from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Q

from ..models import CommunityPost, PostComment, PostVote, Course
from ..serializers import CommunityPostSerializer, CreatePostCommentSerializer, CreatePostSerializer, PostCommentSerializer

class PostListCreateAPIView(APIView):
    """GET /api/posts/ — Danh sách bài viết cộng đồng.
    POST /api/posts/ — Tạo bài viết mới."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = CommunityPost.objects.filter(is_active=True).select_related(
            "user", "course"
        ).prefetch_related("votes", "comments__user")

        sort = request.query_params.get("sort", "recent")
        if sort == "top":
            queryset = queryset.annotate(
                score=Count("votes", filter=Q(votes__vote_type=PostVote.UPVOTE))
                - Count("votes", filter=Q(votes__vote_type=PostVote.DOWNVOTE))
            ).order_by("-score", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        posts = queryset[:50]
        serializer = CommunityPostSerializer(
            posts, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        ser = CreatePostSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        course = None
        course_id = ser.validated_data.get("course_id")
        if course_id:
            try:
                course = Course.objects.get(id=course_id, is_active=True)
            except Course.DoesNotExist:
                return Response(
                    {"detail": "Khóa học không tồn tại."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        post = CommunityPost.objects.create(
            user=request.user,
            title=ser.validated_data.get("title", ""),
            content=ser.validated_data["content"],
            course=course,
            image=ser.validated_data.get("image"),
        )

        out = CommunityPostSerializer(post, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class PostVoteAPIView(APIView):
    """POST /api/posts/<post_id>/vote/ — Toggle upvote/downvote."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        vote_type = request.data.get("vote_type")
        if vote_type not in ("up", "down"):
            return Response(
                {"detail": "vote_type phải là 'up' hoặc 'down'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            post = CommunityPost.objects.get(id=post_id, is_active=True)
        except CommunityPost.DoesNotExist:
            return Response(
                {"detail": "Bài viết không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing_vote = PostVote.objects.filter(
            user=request.user, post=post
        ).first()

        if existing_vote:
            if existing_vote.vote_type == vote_type:
                existing_vote.delete()
                return Response({"action": "removed", "vote_type": None})
            else:
                existing_vote.vote_type = vote_type
                existing_vote.save()
                return Response({"action": "switched", "vote_type": vote_type})
        else:
            PostVote.objects.create(
                user=request.user, post=post, vote_type=vote_type
            )
            return Response({"action": "added", "vote_type": vote_type})


class PostCommentAPIView(APIView):
    """GET/POST /api/posts/<post_id>/comments/ - Danh sach va tao tra loi."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, post_id):
        try:
            post = CommunityPost.objects.get(id=post_id, is_active=True)
        except CommunityPost.DoesNotExist:
            return Response(
                {"detail": "Bai viet khong ton tai."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            limit = min(max(int(request.query_params.get("limit", 20)), 1), 50)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            return Response(
                {"detail": "limit va offset phai la so nguyen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = post.comments.filter(is_active=True).select_related("user").order_by("created_at")
        total = queryset.count()
        comments = queryset[offset : offset + limit]
        serializer = PostCommentSerializer(comments, many=True)
        return Response(
            {
                "count": total,
                "next_offset": offset + limit if offset + limit < total else None,
                "results": serializer.data,
            }
        )

    def post(self, request, post_id):
        ser = CreatePostCommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            post = CommunityPost.objects.get(id=post_id, is_active=True)
        except CommunityPost.DoesNotExist:
            return Response(
                {"detail": "Bai viet khong ton tai."},
                status=status.HTTP_404_NOT_FOUND,
            )

        comment = PostComment.objects.create(
            user=request.user,
            post=post,
            content=ser.validated_data["content"],
        )

        out = PostCommentSerializer(comment)
        return Response(out.data, status=status.HTTP_201_CREATED)


class PostDetailAPIView(APIView):
    """DELETE /api/posts/<post_id>/ — Xóa bài viết (chỉ chủ sở hữu)."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, post_id):
        try:
            post = CommunityPost.objects.get(id=post_id)
        except CommunityPost.DoesNotExist:
            return Response(
                {"detail": "Bài viết không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if post.user != request.user:
            return Response(
                {"detail": "Bạn không có quyền xóa bài viết này."},
                status=status.HTTP_403_FORBIDDEN,
            )

        post.delete()
        return Response({"detail": "Đã xóa bài viết thành công."}, status=status.HTTP_200_OK)


class PostCommentDetailAPIView(APIView):
    """PUT /api/posts/<post_id>/comments/<comment_id>/ — Sửa bình luận (chỉ chủ sở hữu).
    DELETE /api/posts/<post_id>/comments/<comment_id>/ — Xóa bình luận (chỉ chủ sở hữu)."""

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, post_id, comment_id):
        try:
            comment = PostComment.objects.get(id=comment_id, post_id=post_id, is_active=True)
        except PostComment.DoesNotExist:
            return Response(
                {"detail": "Bình luận không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if comment.user != request.user:
            return Response(
                {"detail": "Bạn không có quyền sửa bình luận này."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = CreatePostCommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        comment.content = ser.validated_data["content"]
        comment.save()

        out = PostCommentSerializer(comment)
        return Response(out.data, status=status.HTTP_200_OK)

    def delete(self, request, post_id, comment_id):
        try:
            comment = PostComment.objects.get(id=comment_id, post_id=post_id)
        except PostComment.DoesNotExist:
            return Response(
                {"detail": "Bình luận không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if comment.user != request.user:
            return Response(
                {"detail": "Bạn không có quyền xóa bình luận này."},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment.delete()
        return Response({"detail": "Đã xóa bình luận thành công."}, status=status.HTTP_200_OK)

