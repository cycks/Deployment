import pytest, uuid

from io import BytesIO
from werkzeug.datastructures import FileStorage, MultiDict
from flask_jwt_extended import decode_token

from app.extensions import db
from app.models.user import User

from tests.utils import register_any_user, login




def create_category(client, token, name="RateCat"):
    """Helper: create and return a category id."""
    resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": f"{name} {uuid.uuid4().hex[:6]}"}
    )
    assert resp.status_code == 201
    return resp.json["id"]



@pytest.mark.parametrize("role", ["superadmin", "admin"])
def test_create_category_by_admin_or_superadmin(client, role):
    # Register and approve user
    user, email = register_any_user(client, role, approved=True)

    # Login and get token
    token = login(client, email).json["access_token"]

    # Use a unique category name for each test run
    unique_name = f"{role.capitalize()} Category {uuid.uuid4().hex[:6]}"

    # Create category
    response = client.post(
        "/api/categories/create_category",  # ✅ fix spelling here
        headers={"Authorization": f"Bearer {token}"},
        json={"name": unique_name}
    )

    # Assertions
    assert response.status_code == 201, f"{role} failed to create category: {response.get_json()}"
    data = response.get_json()
    assert "id" in data and "name" in data
    assert data["name"] == unique_name


def test_add_comment_endpoint(client):
    # Register and approve an admin (for category creation)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve an author (for post/comment)
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Admin creates category
    category_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"Test Category {uuid.uuid4().hex[:6]}"}
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json["id"]

    # Author creates post
    image_data = (BytesIO(b"fake image content"), "test.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Test Post {uuid.uuid4().hex[:6]}"),
            ("content", "Some content"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Author adds a comment to the post
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"content": "This is a test comment"}
    )

    assert comment_resp.status_code == 201
    json_data = comment_resp.get_json()
    assert json_data is not None
    assert "comment_id" in json_data


def test_unauthenticated_user_can_view_post_comments(client):
    # Register and approve admin to create category
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve author to create post
    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Admin creates category
    cat_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"ViewCommentsCat {uuid.uuid4().hex[:6]}"}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]

    # Author creates a post
    image_data = (BytesIO(b"comment test"), "post.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Commented Post {uuid.uuid4().hex[:6]}"),
            ("content", "Post with comments"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Register and approve commentator
    commentator, comm_email = register_any_user(client, "commentator", approved=True)
    comm_token = login(client, comm_email).json["access_token"]

    # Commentator adds a comment
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {comm_token}"},
        json={"content": "This is a test comment"}
    )
    assert comment_resp.status_code == 201

    # Unauthenticated user fetches post details with comments
    view_resp = client.get(f"/api/comments/post/{post_id}")
    assert view_resp.status_code == 200

    data = view_resp.get_json()
    assert "comments" in data
    assert data["total"] >= 1
    assert any("This is a test comment" in c["content"] for c in data["comments"])


def test_comment_deletion_permissions(client):
    # Register and approve superadmin, admin, author (for post), and commentator (for comment)
    superadmin, superadmin_email = register_any_user(client, "superadmin", approved=True)
    admin, admin_email = register_any_user(client, "admin", approved=True)
    author, author_email = register_any_user(client, "author", approved=True)
    commentator, commentator_email = register_any_user(client, "commentator", approved=True)

    superadmin_token = login(client, superadmin_email).json["access_token"]
    admin_token = login(client, admin_email).json["access_token"]
    author_token = login(client, author_email).json["access_token"]
    commentator_token = login(client, commentator_email).json["access_token"]

    # Superadmin creates category
    cat_resp = client.post(
        "/api/categories/create_category",
        headers={"Authorization": f"Bearer {superadmin_token}"},
        json={"name": f"CommentDelCat {uuid.uuid4().hex[:6]}"}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]

    # Author creates a post
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Commented Post {uuid.uuid4().hex[:6]}"),
            ("content", "Post for comments"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=BytesIO(b"image"), filename="img.jpg", content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Commentator adds a comment
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {commentator_token}"},
        json={"content": "Comment to be deleted"}
    )
    assert comment_resp.status_code == 201
    comment_id = comment_resp.json["comment_id"]
    2# ✅ Commentator deletes their own comment
    delete_resp = client.delete(
        f"/api/comments/delete_comment/{comment_id}",
        headers={"Authorization": f"Bearer {commentator_token}"}
    )
    assert delete_resp.status_code == 200

    # Re-add comment to test with admin and superadmin
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {commentator_token}"},
        json={"content": "Comment for admin and superadmin test"}
    )
    assert comment_resp.status_code == 201
    comment_id = comment_resp.json["comment_id"]

    # ✅ Admin deletes comment
    admin_del_resp = client.delete(
        f"/api/comments/delete_comment/{comment_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_del_resp.status_code == 200

    # Re-add again
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {commentator_token}"},
        json={"content": "Final test comment"}
    )
    assert comment_resp.status_code == 201
    comment_id = comment_resp.json["comment_id"]

    # ✅ Superadmin deletes comment
    superadmin_del_resp = client.delete(
        f"/api/comments/delete_comment/{comment_id}",
        headers={"Authorization": f"Bearer {superadmin_token}"}
    )
    assert superadmin_del_resp.status_code == 200


@pytest.mark.parametrize("rater_role", ["author", "commentator", "admin", "superadmin"])
def test_logged_in_user_can_rate_comment(client, rater_role):
    # ---------------------------------------------------
    # 1) Setup – admin (for category), author (for post)
    # ---------------------------------------------------
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    author, author_email = register_any_user(client, "author", approved=True)
    author_token = login(client, author_email).json["access_token"]

    # Category
    category_id = create_category(client, admin_token)

    # ---------------------------------------------------
    # 2) Author creates a post
    # ---------------------------------------------------
    image_data = (BytesIO(b"img"), "pic.jpg")
    post_resp = client.post(
        "/api/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data=MultiDict([
            ("title", f"Rated Post {uuid.uuid4().hex[:6]}"),
            ("content", "Post to rate a comment on"),
            ("category_id", str(category_id)),
            ("images", FileStorage(stream=image_data[0],
                                   filename=image_data[1],
                                   content_type="image/jpeg"))
        ]),
        content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # ---------------------------------------------------
    # 3) Author adds a comment (target of rating)
    # ---------------------------------------------------
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"content": "Original comment text"}
    )
    assert comment_resp.status_code == 201
    comment_id = comment_resp.json["comment_id"]

    # ---------------------------------------------------
    # 4) Register & login the *rater* user
    # ---------------------------------------------------
    rater, rater_email = register_any_user(client, rater_role, approved=True)
    rater_token = login(client, rater_email).json["access_token"]

    # ---------------------------------------------------
    # 5) Rate the comment
    # ---------------------------------------------------
    rate_resp = client.post(
        f"/api/comments/rate/{comment_id}",
        headers={"Authorization": f"Bearer {rater_token}"},
        json={"value": 4}            # value in your 1-5 range
    )

    assert rate_resp.status_code == 200, f"{rater_role} could not rate comment"
    data = rate_resp.get_json()
    assert data is not None and data.get("msg", "").lower().startswith("rating submitted")

    # ---------------------------------------------------
    # 6) Optional: second rating by same user should fail
    # ---------------------------------------------------
    dup_resp = client.post(
        f"/api/comments/rate/{comment_id}",
        headers={"Authorization": f"Bearer {rater_token}"},
        json={"value": 2}
    )
    assert dup_resp.status_code == 400



def test_full_post_comment_rating_flow(client):
    # Register and approve admin
    admin, admin_email = register_any_user(client, "admin", approved=True)
    admin_token = login(client, admin_email).json["access_token"]

    # Register and approve author (via admin)
    author, author_email = register_any_user(client, "author", approved=False)
    approve_resp = client.put(
        f"/api/users/approve/author/{author.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_resp.status_code == 200
    author_token = login(client, author_email).json["access_token"]

    # Create a unique category name to avoid IntegrityError
    unique_name = f"Tech Category {uuid.uuid4().hex[:6]}"

    # Create category
    cat_resp = client.post(
        "/api/categories/create_category",  # ✅ correct route
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": unique_name}
    )
    assert cat_resp.status_code == 201
    category_id = cat_resp.json["id"]

    # Create post with image
    image_data = (BytesIO(b"fake image content"), "test.jpg")

    post_resp = client.post(
    "/api/posts",
    headers={"Authorization": f"Bearer {author_token}"},
    data=MultiDict([
        ("title", f"Edge Post {uuid.uuid4().hex[:6]}"),
        ("content", "Post content"),
        ("category_id", str(category_id)),
        ("images", FileStorage(stream=image_data[0], filename=image_data[1], content_type="image/jpeg"))
    ]),
    content_type="multipart/form-data"
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json["post_id"]

    # Add a comment
    comment_resp = client.post(
        f"/api/comments/add_comment/{post_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"content": "Nice work!"}
    )


    assert comment_resp.status_code == 201, "Comment creation failed"
    json_data = comment_resp.get_json()
    assert json_data is not None and "comment_id" in json_data, "Invalid JSON response for comment"

    comment_id = json_data["comment_id"]

    # Rate the comment
    rate_resp = client.post(
        f"/api/comments/rate/{comment_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"value": 5}
    )
    assert rate_resp.status_code == 200


    # Duplicate rating should fail
    dup_rate = client.post(
        f"/api/comments/rate/{comment_id}",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"value": 3}
    )
    assert dup_rate.status_code == 400

    # Add extra comments to test pagination
    for _ in range(6):
        client.post(
            f"/api/comments/add_comment/{post_id}",
            headers={"Authorization": f"Bearer {author_token}"},
            json={"content": "Extra comment"}
        )

    # Paginate comments
    paginated = client.get(f"/api/comments/post/{post_id}?page=2&per_page=5")
    assert paginated.status_code == 200
    assert "comments" in paginated.json
    assert len(paginated.json["comments"]) <= 5