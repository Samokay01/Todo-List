//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require("lodash")


const app = express();
main().catch(err => console.log(err));



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));


async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/todolistDB');

    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/todolistDB');` if your database has auth enabled
}

const itemsSchema = new mongoose.Schema({
    name: String
});

const Item = mongoose.model('Item', itemsSchema);

const item1 = new Item({
    name: 'Buy Food'
});
const item2 = new Item({
    name: 'Cook Food'
});
const item3 = new Item({
    name: 'Cook Food'
});

const defaultItems = [item1, item2, item3]

const listSchema = {
    name: String,
    items: [itemsSchema]
}

const List = mongoose.model("List", listSchema)


app.get("/", function (req, res) {
    Item.find()
        .then(function (foundItems) {
            if (foundItems.length === 0) {
                Item.insertMany(defaultItems);
                res.redirect("/")
            } else {
                res.render("list", {
                    listTitle: "Today",
                    newListItems: foundItems
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.post("/", function (req, res) {

    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
        name: itemName
    });

    if (listName === "Today") {
        item.save();
        res.redirect("/")
    } else {
        List.findOne({
                name: listName
            })
            .then(function (foundList) {
                foundList.items.push(item);
                foundList.save();
                res.redirect("/" + listName);
            })
            .catch(function (err) {
                console.log(err);
            });
    }

});

app.get("/:customListName", function (req, res) {
    const listName = _.capitalize(req.params.customListName;)

    List.findOne({
            name: listName
        })
        .then(function (foundList) {
            if (!foundList) {
                const list = new List({
                    name: listName,
                    items: defaultItems
                })

                list.save()
                res.redirect("/")
            } else {
                res.render("list", {
                    listTitle: foundList.name,
                    newListItems: foundList.items
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.get("/about", function (req, res) {
    res.render("about");
});

app.post("/delete", (req, res) => {
    const checkedItemId = req.body.checkbox
    const listName = req.body.listName

    if (listName === "Today") {
        Item.findByIdAndDelete(checkedItemId).exec()
        res.redirect("/")
    } else {
        List.findOneAndUpdate({
            name: listName
        }, {
            $pull: {
                items: {
                    _id: checkedItemId
                }
            }
        }).exec()
        res.redirect("/" + listName)
    }
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});
